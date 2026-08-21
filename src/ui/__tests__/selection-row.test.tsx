import { fireEvent, render } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { SelectionRow } from '@/ui/selection-row';
import { Layout } from '@/theme';

describe('selection surfaces', () => {
  it('keeps a static Card free of pressable semantics', async () => {
    const view = await render(
      <Card>
        <ThemedText>Static card</ThemedText>
      </Card>,
    );

    expect(view.queryByRole('button')).toBeNull();
  });

  it('exposes SelectionRow semantics and forwards optional props', async () => {
    const onPress = jest.fn();
    const view = await render(
      <SelectionRow
        label="Big emotions"
        onPress={onPress}
        accessibilityHint="Choose this challenge"
        testID="emotion-row"
      />,
    );

    const row = view.getByRole('button', { name: 'Big emotions' });
    expect(row.props.accessibilityHint).toBe('Choose this challenge');
    expect(view.getByTestId('emotion-row')).toBe(row);

    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the shared 44pt chip-height token for interactive chips', async () => {
    const view = await render(
      <Chip onPress={jest.fn()}>
        <ThemedText>Trigger</ThemedText>
      </Chip>,
    );
    const chip = view.getByText('Trigger').parent?.parent;

    expect(chip?.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ minHeight: Layout.chipHeight }),
    ]));
    expect(Layout.chipHeight).toBe(44);
  });
  it('exposes selected single-choice state and supporting text', async () => {
    const view = await render(
      <SelectionRow
        label="Barnaby"
        supportingText="Bear"
        selected
        onPress={jest.fn()}
      />,
    );

    const row = view.getByRole('radio', { name: 'Barnaby, Bear' });
    expect(row.props.accessibilityState).toEqual({ selected: true });
    expect(view.getByText('Bear')).toBeTruthy();
  });

});
